//! One foundry's job mailbox on NEAR testnet.
//! USDC arrives by `ft_on_transfer`. This contract opens the Clearing escrow,
//! locks that USDC, and only then stores the job.

use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::serde_json::json;
use near_sdk::store::Vector;
use near_sdk::{env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue, PromiseResult};

const MAX_TEXT: usize = 280;
const MAX_PAGE: u64 = 50;
const MIN_AMOUNT: u128 = 1_000_000;
const USDC: &str = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
const GAS_OPEN: Gas = Gas::from_tgas(40);
const GAS_AFTER_OPEN: Gas = Gas::from_tgas(120);
const GAS_FT_CALL: Gas = Gas::from_tgas(50);
const GAS_AFTER_FUND: Gas = Gas::from_tgas(20);
const GAS_ESCROW: Gas = Gas::from_tgas(40);
const GAS_CONTINUE: Gas = Gas::from_tgas(80);
const GAS_FT_TRANSFER: Gas = Gas::from_tgas(20);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum Prefix {
    Jobs,
    Deals,
}

#[near(serializers = [json])]
struct OpenMsg {
    brief: String,
    payload: String,
    nonce: String,
    signature: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Job {
    pub id: u64,
    pub buyer: AccountId,
    pub brief: String,
    pub escrow_id: u64,
    pub status: String,
    pub claimer: Option<AccountId>,
    pub result: Option<String>,
    pub expires_at: String,
    pub claim_deadline: String,
    pub settle_step: String,
    pub payout: Option<AccountId>,
    pub amount: u128,
}

#[near(serializers = [json])]
pub struct Web4Request {
    path: String,
}

#[near(serializers = [json])]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    content_type: String,
    body: Base64VecU8,
    status: u16,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Mailbox {
    escrow_account: AccountId,
    token_id: AccountId,
    payee: Option<AccountId>,
    foundry_id: AccountId,
    foundry_pk: String,
    claim_window_ns: u64,
    submit_window_ns: u64,
    network: String,
    next_id: u64,
    jobs: Vector<Job>,
    deals: near_sdk::store::LookupMap<u64, u64>,
}

#[ext_contract(ext_escrow)]
trait EscrowOps {
    fn open(&mut self, payload: String, nonce: String, signature: String) -> u64;
    fn accept(&mut self, deal_id: u64, nonce: String, signature: String);
    fn release_after_timeout(&mut self, deal_id: u64);
    fn refund_late(&mut self, deal_id: u64);
    fn withdraw(&mut self);
    fn get_deal(&self, deal_id: u64) -> near_sdk::serde_json::Value;
    fn get_token_id(&self) -> AccountId;
    fn get_creator_pk(&self) -> String;
    fn get_balance(&self, account_id: AccountId) -> U128;
}

#[ext_contract(ext_ft)]
trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128>;
}

#[near]
impl Mailbox {
    #[init]
    pub fn new(
        escrow_account: AccountId,
        token_id: AccountId,
        payee: Option<AccountId>,
        foundry_id: AccountId,
        foundry_pk: String,
        claim_window_ns: u64,
        submit_window_ns: u64,
        network: String,
    ) -> Self {
        require!(network == "testnet", "network must be testnet");
        let here = env::current_account_id().to_string();
        require!(here.ends_with(".testnet"), "mailbox is testnet only");
        require!(escrow_account.as_str().ends_with(".testnet"), "escrow is testnet only");
        require!(foundry_id.as_str().ends_with(".testnet"), "foundry is testnet only");
        require!(foundry_pk.len() == 64, "foundry key is required");
        require!(token_id.as_str() == USDC, "token must be testnet USDC");
        if let Some(payee) = &payee {
            require!(payee.as_str().ends_with(".testnet"), "payee is testnet only");
            require!(payee != &escrow_account, "escrow account and payee must differ");
        }
        require!(claim_window_ns > 0 && submit_window_ns > 0, "window is required");
        Self {
            escrow_account,
            token_id,
            payee,
            foundry_id,
            foundry_pk,
            claim_window_ns,
            submit_window_ns,
            network,
            next_id: 1,
            jobs: Vector::new(Prefix::Jobs),
            deals: near_sdk::store::LookupMap::new(Prefix::Deals),
        }
    }

    /// The buyer sends USDC here. `msg` carries the brief and the foundry's
    /// escrow `open` signature. The job is stored only after the escrow is funded.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        if env::predecessor_account_id() != self.token_id || amount.0 < MIN_AMOUNT {
            return PromiseOrValue::Value(amount);
        }
        let parsed: OpenMsg = match near_sdk::serde_json::from_str(&msg) {
            Ok(value) => value,
            Err(_) => return PromiseOrValue::Value(amount),
        };
        if parsed.brief.is_empty() || parsed.brief.len() > MAX_TEXT {
            return PromiseOrValue::Value(amount);
        }
        PromiseOrValue::Promise(
            ext_escrow::ext(self.escrow_account.clone())
                .with_static_gas(GAS_OPEN)
                .open(parsed.payload, parsed.nonce, parsed.signature)
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_AFTER_OPEN)
                        .on_escrow_opened(sender_id, amount, parsed.brief),
                ),
        )
    }

    #[private]
    pub fn on_escrow_opened(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        brief: String,
    ) -> PromiseOrValue<U128> {
        let deal_id = match env::promise_result(0) {
            PromiseResult::Successful(bytes) => parse_u64(&bytes).unwrap_or(0),
            _ => 0,
        };
        if deal_id == 0 {
            return PromiseOrValue::Value(amount);
        }
        PromiseOrValue::Promise(
            ext_ft::ext(self.token_id.clone())
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_FT_CALL)
                .ft_transfer_call(
                    self.escrow_account.clone(),
                    amount,
                    None,
                    json!({ "deal_id": deal_id }).to_string(),
                )
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(Gas::from_tgas(70))
                        .on_escrow_funded(sender_id, amount, brief, deal_id),
                ),
        )
    }

    #[private]
    pub fn on_escrow_funded(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        brief: String,
        deal_id: u64,
    ) -> Promise {
        ext_escrow::ext(self.escrow_account.clone())
            .with_static_gas(GAS_AFTER_FUND)
            .get_deal(deal_id)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_AFTER_FUND)
                    .on_deal_checked(sender_id, amount, brief, deal_id),
            )
    }

    /// `ft_resolve_transfer` returns the amount kept by the receiver. A funded
    /// deal is the proof. Anything else refunds the buyer.
    #[private]
    pub fn on_deal_checked(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        brief: String,
        deal_id: u64,
    ) -> U128 {
        let token_id = self.token_id.clone();
        let foundry_pk = self.foundry_pk.clone();
        let bound = self.deals.get(&deal_id).is_some();
        let funded = match env::promise_result(0) {
            PromiseResult::Successful(bytes) => deal_funded(
                &bytes,
                amount.0,
                sender_id.as_str(),
                &[],
                &[],
                token_id.as_str(),
                &foundry_pk,
                bound,
            ),
            _ => false,
        };
        if !funded || deal_id == 0 {
            return amount;
        }
        self.deals.insert(deal_id, self.next_id);
        let window = self.claim_window_ns;
        let id = self.next_id;
        self.next_id += 1;
        let expires = env::block_timestamp().saturating_add(window);
        self.jobs.push(Job {
            id,
            buyer: sender_id,
            brief,
            escrow_id: deal_id,
            status: "posted".to_string(),
            claimer: None,
            result: None,
            expires_at: expires.to_string(),
            claim_deadline: String::new(),
            settle_step: String::new(),
            payout: None,
            amount: amount.0,
        });
        U128(0)
    }

    pub fn get_jobs(&self, status: Option<String>, from: u64, limit: u64) -> Vec<Job> {
        let cap = if limit == 0 { 0 } else { limit.min(MAX_PAGE) };
        let mut out = Vec::new();
        for job in self.jobs.iter() {
            if job.id < from {
                continue;
            }
            if status.as_ref().is_some_and(|want| want != &job.status) {
                continue;
            }
            out.push(job.clone());
            if out.len() as u64 >= cap {
                break;
            }
        }
        out
    }

    pub fn claim_job(&mut self, id: u64) {
        let window = self.submit_window_ns;
        let caller = env::predecessor_account_id();
        let job = self.job_mut(id);
        require!(job.status == "posted", "job is not posted");
        let now = env::block_timestamp();
        require!(now <= parse_ns(&job.expires_at), "job has expired");
        job.claimer = Some(caller);
        job.status = "claimed".to_string();
        job.claim_deadline = now.saturating_add(window).to_string();
    }

    pub fn submit_result(&mut self, id: u64, result: String) {
        require!(!result.is_empty() && result.len() <= MAX_TEXT, "bad result");
        let caller = env::predecessor_account_id();
        let job = self.job_mut(id);
        require!(job.status == "claimed", "job is not claimed");
        require!(job.claimer.as_ref() == Some(&caller), "only the claimer submits");
        require!(env::block_timestamp() <= parse_ns(&job.claim_deadline), "submit window has passed");
        job.result = Some(result);
        job.status = "submitted".to_string();
    }

    pub fn refund_expired(&mut self, id: u64) -> Promise {
        let deal_id = {
            let job = self.job_mut(id);
            let now = env::block_timestamp();
            if job.status == "posted" {
                require!(now > parse_ns(&job.expires_at), "job has not expired");
            } else if job.status == "claimed" {
                require!(now > parse_ns(&job.claim_deadline), "claim deadline has not passed");
            } else {
                env::panic_str("job is not refundable");
            }
            job.status = "refunded".to_string();
            job.escrow_id
        };
        ext_escrow::ext(self.escrow_account.clone())
            .with_static_gas(GAS_ESCROW)
            .refund_late(deal_id)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CONTINUE)
                    .on_refund(id),
            )
    }

    #[private]
    pub fn on_refund(&mut self, id: u64) {
        if !matches!(env::promise_result(0), PromiseResult::Successful(_)) {
            if let Some(job) = self.job_mut_optional(id) {
                if job.claimer.is_some() {
                    job.status = "claimed".to_string();
                } else {
                    job.status = "posted".to_string();
                }
            }
        }
    }

    /// Buyer accepts. The mailbox calls the escrow, withdraws, then pays the payee.
    pub fn accept(&mut self, id: u64, nonce: String, signature: String) -> Promise {
        let deal_id = self.start_settle(id, true);
        ext_escrow::ext(self.escrow_account.clone())
            .with_static_gas(GAS_ESCROW)
            .accept(deal_id, nonce, signature)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CONTINUE)
                    .on_settle_step(id),
            )
    }

    pub fn release_timeout(&mut self, id: u64) -> Promise {
        let (deal_id, status, expires_at) = {
            let job = self.job_mut(id);
            (job.escrow_id, job.status.clone(), job.expires_at.clone())
        };
        require!(status == "submitted", "job is not submitted");
        require!(env::block_timestamp() > parse_ns(&expires_at), "submit window has not passed");
        self.mark_settling(id);
        let deal_id = deal_id;
        ext_escrow::ext(self.escrow_account.clone())
            .with_static_gas(GAS_ESCROW)
            .release_after_timeout(deal_id)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_CONTINUE)
                    .on_settle_step(id),
            )
    }

    /// Read the escrow deal and the foundry's withdrawable balance. Advance only
    /// when that view shows the money moved. Otherwise leave the job alone.
    pub fn retry_settle(&mut self, id: u64) -> Promise {
        let (deal_id, status) = {
            let job = self.job_mut(id);
            (job.escrow_id, job.status.clone())
        };
        require!(status == "settling", "job is not settling");
        let foundry = self.foundry_id.clone();
        ext_escrow::ext(self.escrow_account.clone())
            .with_static_gas(Gas::from_tgas(15))
            .get_deal(deal_id)
            .and(
                ext_escrow::ext(self.escrow_account.clone())
                    .with_static_gas(Gas::from_tgas(15))
                    .get_balance(foundry),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(20))
                    .on_retry_checked(id),
            )
    }

    #[private]
    pub fn on_retry_checked(&mut self, id: u64) {
        let released = match env::promise_result(0) {
            PromiseResult::Successful(bytes) => {
                near_sdk::serde_json::from_slice::<near_sdk::serde_json::Value>(&bytes)
                    .ok()
                    .and_then(|value| value.get("state").and_then(|item| item.as_str()).map(|s| s.to_string()))
                    .unwrap_or_default()
                    == "Released"
            }
            _ => false,
        };
        let balance = match env::promise_result(1) {
            PromiseResult::Successful(bytes) => parse_u128(&bytes).unwrap_or(u128::MAX),
            _ => u128::MAX,
        };
        let job = self.job_mut(id);
        if job.status != "settling" {
            return;
        }
        if job.settle_step == "withdraw" && released {
            job.settle_step = "transfer".to_string();
            return;
        }
        if job.settle_step == "transfer" && released && balance == 0 {
            job.settle_step = "done".to_string();
            job.status = "accepted".to_string();
        }
    }

    pub fn bind_job(&mut self, deal_id: u64, brief: String) -> Promise {
        require!(!brief.is_empty() && brief.len() <= MAX_TEXT, "bad brief");
        require!(self.deals.get(&deal_id).is_none(), "deal is already bound");
        let buyer = env::predecessor_account_id();
        ext_escrow::ext(self.escrow_account.clone())
            .with_static_gas(Gas::from_tgas(15))
            .get_deal(deal_id)
            .and(
                ext_escrow::ext(self.escrow_account.clone())
                    .with_static_gas(Gas::from_tgas(10))
                    .get_token_id(),
            )
            .and(
                ext_escrow::ext(self.escrow_account.clone())
                    .with_static_gas(Gas::from_tgas(10))
                    .get_creator_pk(),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(30))
                    .on_bind(buyer, deal_id, brief),
            )
    }

    #[private]
    pub fn on_bind(&mut self, buyer: AccountId, deal_id: u64, brief: String) {
        require!(self.deals.get(&deal_id).is_none(), "deal is already bound");
        let deal_bytes = match env::promise_result(0) {
            PromiseResult::Successful(bytes) => bytes,
            _ => env::panic_str("escrow deal was not read"),
        };
        let token_bytes = match env::promise_result(1) {
            PromiseResult::Successful(bytes) => bytes,
            _ => env::panic_str("escrow token was not read"),
        };
        let pk_bytes = match env::promise_result(2) {
            PromiseResult::Successful(bytes) => bytes,
            _ => env::panic_str("escrow creator was not read"),
        };
        let price = near_sdk::serde_json::from_slice::<near_sdk::serde_json::Value>(&deal_bytes)
            .ok()
            .map(|value| deal_price(&value))
            .unwrap_or(0);
        require!(
            deal_funded(
                &deal_bytes,
                price,
                buyer.as_str(),
                &token_bytes,
                &pk_bytes,
                self.token_id.as_str(),
                &self.foundry_pk,
                false,
            ),
            "deal is not bound to this post"
        );
        let window = self.claim_window_ns;
        let id = self.next_id;
        self.next_id += 1;
        self.deals.insert(deal_id, id);
        let expires = env::block_timestamp().saturating_add(window);
        self.jobs.push(Job {
            id,
            buyer,
            brief,
            escrow_id: deal_id,
            status: "posted".to_string(),
            claimer: None,
            result: None,
            expires_at: expires.to_string(),
            claim_deadline: String::new(),
            settle_step: String::new(),
            payout: None,
            amount: price,
        });
    }

    /// The escrow credits its creator account, so this callback only records
    /// the step. `retry_settle` resumes withdraw, then the creator transfer.
    #[private]
    pub fn on_settle_step(&mut self, id: u64) {
        if !matches!(env::promise_result(0), PromiseResult::Successful(_)) {
            self.roll_back_escrow(id);
            return;
        }
        let job = self.job_mut(id);
        job.settle_step = "withdraw".to_string();
    }

    pub fn web4_get(&self, request: Web4Request) -> Web4Response {
        let path = request.path.split('?').next().unwrap_or("/");
        let body = if let Some(id_text) = path.strip_prefix("/jobs/") {
            match id_text.parse::<u64>() {
                Ok(id) => match self.find(id) {
                    Some(job) => (200, near_sdk::serde_json::to_vec(job).unwrap_or_default()),
                    None => (404, br#"{"error":"unknown job"}"#.to_vec()),
                },
                Err(_) => (404, br#"{"error":"unknown job"}"#.to_vec()),
            }
        } else {
            let jobs = self.get_jobs(None, 0, MAX_PAGE);
            (200, near_sdk::serde_json::to_vec(&jobs).unwrap_or_default())
        };
        Web4Response {
            content_type: "application/json".to_string(),
            status: body.0,
            body: Base64VecU8::from(body.1),
        }
    }

    pub fn get_payee(&self) -> Option<AccountId> {
        self.payee.clone()
    }
}

fn parse_ns(text: &str) -> u64 {
    text.parse().unwrap_or_else(|_| env::panic_str("bad expires_at"))
}

fn parse_u64(bytes: &[u8]) -> Option<u64> {
    near_sdk::serde_json::from_slice::<u64>(bytes).ok()
}

fn parse_u128(bytes: &[u8]) -> Option<u128> {
    near_sdk::serde_json::from_slice::<U128>(bytes).ok().map(|value| value.0)
        .or_else(|| near_sdk::serde_json::from_slice::<u128>(bytes).ok())
        .or_else(|| json_text(bytes).parse().ok())
}

fn json_text(bytes: &[u8]) -> String {
    near_sdk::serde_json::from_slice::<String>(bytes).unwrap_or_default()
}

fn deal_price(value: &near_sdk::serde_json::Value) -> u128 {
    value.get("price").and_then(|item| {
        item.as_u64().map(|n| n as u128).or_else(|| item.as_str().and_then(|text| text.parse().ok()))
    }).unwrap_or(0)
}

/// A funded deal counts only when the buyer, token, and escrow creator match
/// this post, and the deal id is not already a job.
fn deal_funded(
    deal_bytes: &[u8],
    amount: u128,
    buyer: &str,
    token_bytes: &[u8],
    creator_pk_bytes: &[u8],
    want_token: &str,
    want_pk: &str,
    already_bound: bool,
) -> bool {
    if already_bound || deal_bytes.is_empty() {
        return false;
    }
    let value: near_sdk::serde_json::Value = match near_sdk::serde_json::from_slice(deal_bytes) {
        Ok(value) => value,
        Err(_) => return false,
    };
    let state = value.get("state").and_then(|item| item.as_str()).unwrap_or("");
    let client = value.get("client").and_then(|item| item.as_str()).unwrap_or("");
    let price = deal_price(&value);
    let token = if token_bytes.is_empty() { String::new() } else { json_text(token_bytes) };
    let creator_pk = if creator_pk_bytes.is_empty() { String::new() } else { json_text(creator_pk_bytes) };
    state == "Funded"
        && price == amount
        && client == buyer
        && token == want_token
        && creator_pk == want_pk
}

impl Mailbox {
    fn find(&self, id: u64) -> Option<&Job> {
        self.jobs.iter().find(|job| job.id == id)
    }

    fn job_index(&self, id: u64) -> u32 {
        let index = self.jobs.iter().position(|job| job.id == id).unwrap_or_else(|| env::panic_str("unknown job"));
        u32::try_from(index).unwrap_or_else(|_| env::panic_str("unknown job"))
    }

    fn job_mut(&mut self, id: u64) -> &mut Job {
        let index = self.job_index(id);
        self.jobs.get_mut(index).unwrap_or_else(|| env::panic_str("unknown job"))
    }

    fn job_mut_optional(&mut self, id: u64) -> Option<&mut Job> {
        let index = self.jobs.iter().position(|job| job.id == id)?;
        let index = u32::try_from(index).ok()?;
        self.jobs.get_mut(index)
    }

    fn payout_account(&self, claimer: Option<AccountId>) -> AccountId {
        if let Some(payee) = &self.payee {
            return payee.clone();
        }
        claimer.unwrap_or_else(|| env::panic_str("claimer is required"))
    }

    fn start_settle(&mut self, id: u64, buyer_only: bool) -> u64 {
        let caller = env::predecessor_account_id();
        let (deal_id, claimer, buyer, status) = {
            let job = self.job_mut(id);
            (job.escrow_id, job.claimer.clone(), job.buyer.clone(), job.status.clone())
        };
        if buyer_only {
            require!(buyer == caller, "only the buyer accepts");
        }
        require!(status == "submitted", "job is not submitted");
        let payout = self.payout_account(claimer);
        let job = self.job_mut(id);
        job.payout = Some(payout);
        job.status = "settling".to_string();
        job.settle_step = "escrow".to_string();
        deal_id
    }

    fn mark_settling(&mut self, id: u64) {
        let claimer = self.job_mut(id).claimer.clone();
        let payout = self.payout_account(claimer);
        let job = self.job_mut(id);
        job.payout = Some(payout);
        job.status = "settling".to_string();
        job.settle_step = "escrow".to_string();
    }

    fn roll_back_escrow(&mut self, id: u64) {
        if let Some(job) = self.job_mut_optional(id) {
            if job.settle_step == "escrow" {
                job.status = "submitted".to_string();
                job.settle_step = String::new();
            }
        }
    }

}
