Thanks for Pinky. This is a small arithmetic fix on `main` at `c94cb144abcc755dfabd7fab96bf0f418c79fcd4`.

## Withdraw already restores the balance

`withdraw_transfer` sends `ft_transfer` and chains the private callback `on_withdraw` (`contract/src/lib.rs` lines 1363 and 1746). When that promise fails, `close_withdraw` writes the amount back onto the side's payout (line 1832). `withdraw_failure_restores_payout` already covers that path. This diff leaves withdraw as it is.

## Credit could hide an overflow

`Deal::credit` added into `client_payout` with `+=` (lines 428 and 435), and the tombstone branch in `credit_deal` did the same (line 1628). `credit_deal` then updated the books with `total_liabilities.saturating_add(amount)` (line 1633). A deposit that overflowed the counter was still accepted, and the liability stayed at `u128::MAX`, so the books no longer matched the tokens held. The `+=` sites panic in a release build because `overflow-checks` is on, and they wrap in a debug or test build.

`checked_u128` is `checked_add` plus `env::panic_str`:

- client payout on a fund, on a later credit, and on a tombstone panics with `payout overflow`
- `total_liabilities` panics with `liability overflow`

`ft_on_transfer` calls `credit_deal`. A panic there reverts the token transfer, so the contract keeps a deposit only when it can record it. Deadline and grace `saturating_add` calls stay as they are. `split` and `refund_all` stay on `+=`.

## Tests

From `contract/`:

- `credit_rejects_an_overflowing_client_payout`
- `credit_deal_rejects_an_overflowing_liability`

Both pass on rustc 1.93 and on stable 1.100. The full lib suite on stable 1.100 is 195 passed, 0 failed.
