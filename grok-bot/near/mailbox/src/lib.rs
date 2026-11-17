//! One foundry's job mailbox on NEAR testnet.
//! The USDC price is locked in the Clearing escrow account named at init.
//! This contract stores the job and serves a read-only page.

use near_sdk::json_types::Base64VecU8;
use near_sdk::store::Vector;
use near_sdk::{env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault};

const MAX_TEXT: usize = 280;
const MAX_PAGE: u64 = 50;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum Prefix {
    Jobs,
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
    payee: AccountId,
    claim_window_ns: u64,
    submit_window_ns: u64,
    next_id: u64,
    jobs: Vector<Job>,
}

#[near]
impl Mailbox {
    #[init]
    pub fn new(
        escrow_account: AccountId,
        payee: AccountId,
        claim_window_ns: u64,
        submit_window_ns: u64,
    ) -> Self {
        require!(escrow_account != payee, "escrow account and payee must differ");
        require!(claim_window_ns > 0 && submit_window_ns > 0, "window is required");
        Self {
            escrow_account,
            payee,
            claim_window_ns,
            submit_window_ns,
            next_id: 1,
            jobs: Vector::new(Prefix::Jobs),
        }
    }

    /// Storage deposit is attached NEAR. The USDC price is locked in the escrow
    /// contract before this call; `escrow_id` is that deal.
    #[payable]
    pub fn post_job(&mut self, brief: String, escrow_id: u64) -> u64 {
        require!(
            env::attached_deposit() >= NearToken::from_yoctonear(1),
            "deposit is required"
        );
        require!(!brief.is_empty() && brief.len() <= MAX_TEXT, "bad brief");
        require!(escrow_id > 0, "escrow id is required");
        let id = self.next_id;
        self.next_id += 1;
        let expires = env::block_timestamp().saturating_add(self.claim_window_ns);
        self.jobs.push(Job {
            id,
            buyer: env::predecessor_account_id(),
            brief,
            escrow_id,
            status: "posted".to_string(),
            claimer: None,
            result: None,
            expires_at: expires.to_string(),
        });
        id
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
        let job = self.job_mut(id);
        require!(job.status == "posted", "job is not posted");
        let now = env::block_timestamp();
        require!(now <= parse_ns(&job.expires_at), "job has expired");
        job.claimer = Some(env::predecessor_account_id());
        job.status = "claimed".to_string();
        job.expires_at = now.saturating_add(window).to_string();
    }

    pub fn submit_result(&mut self, id: u64, result: String) {
        require!(!result.is_empty() && result.len() <= MAX_TEXT, "bad result");
        let window = self.submit_window_ns;
        let caller = env::predecessor_account_id();
        let job = self.job_mut(id);
        require!(job.status == "claimed", "job is not claimed");
        require!(job.claimer.as_ref() == Some(&caller), "only the claimer submits");
        require!(env::block_timestamp() <= parse_ns(&job.expires_at), "submit window has passed");
        job.result = Some(result);
        job.status = "submitted".to_string();
        job.expires_at = env::block_timestamp().saturating_add(window).to_string();
    }

    /// Buyer accepts. The client then releases the escrow deal to the payee.
    pub fn accept(&mut self, id: u64) -> u64 {
        let caller = env::predecessor_account_id();
        let job = self.job_mut(id);
        require!(job.buyer == caller, "only the buyer accepts");
        require!(job.status == "submitted", "job is not submitted");
        job.status = "accepted".to_string();
        job.escrow_id
    }

    pub fn release_timeout(&mut self, id: u64) -> u64 {
        let job = self.job_mut(id);
        require!(job.status == "submitted", "job is not submitted");
        require!(env::block_timestamp() > parse_ns(&job.expires_at), "submit window has not passed");
        job.status = "released".to_string();
        job.escrow_id
    }

    pub fn refund_expired(&mut self, id: u64) -> u64 {
        let job = self.job_mut(id);
        require!(job.status == "posted", "job is not posted");
        require!(env::block_timestamp() > parse_ns(&job.expires_at), "job has not expired");
        job.status = "refunded".to_string();
        job.escrow_id
    }

    pub fn web4_get(&self, request: Web4Request) -> Web4Response {
        let path = request.path.split('?').next().unwrap_or("/");
        let body = if let Some(id_text) = path.strip_prefix("/jobs/") {
            match id_text.parse::<u64>() {
                Ok(id) => match self.find(id) {
                    Some(job) => (200, serde_json::to_vec(job).unwrap_or_default()),
                    None => (404, br#"{"error":"unknown job"}"#.to_vec()),
                },
                Err(_) => (404, br#"{"error":"unknown job"}"#.to_vec()),
            }
        } else {
            let jobs = self.get_jobs(None, 0, MAX_PAGE);
            (200, serde_json::to_vec(&jobs).unwrap_or_default())
        };
        Web4Response {
            content_type: "application/json".to_string(),
            status: body.0,
            body: Base64VecU8::from(body.1),
        }
    }

    pub fn get_payee(&self) -> AccountId {
        self.payee.clone()
    }

    pub fn get_escrow_account(&self) -> AccountId {
        self.escrow_account.clone()
    }
}

fn parse_ns(text: &str) -> u64 {
    text.parse().unwrap_or_else(|_| env::panic_str("bad expires_at"))
}

impl Mailbox {
    fn find(&self, id: u64) -> Option<&Job> {
        self.jobs.iter().find(|job| job.id == id)
    }

    fn job_mut(&mut self, id: u64) -> &mut Job {
        let index = self.jobs.iter().position(|job| job.id == id);
        let index = u32::try_from(index.unwrap_or_else(|| env::panic_str("unknown job")))
            .unwrap_or_else(|_| env::panic_str("unknown job"));
        self.jobs.get_mut(index).unwrap_or_else(|| env::panic_str("unknown job"))
    }
}
