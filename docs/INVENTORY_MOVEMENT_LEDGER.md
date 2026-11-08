# Inventory movement ledger contract

The ledger represents **available stock**, where:

`available = stock_on_hand - stock_reserved`

- Opening balance is recorded once as an `adjustment` for the current physical on-hand quantity.
- Checkout reservation decreases available stock with a negative `reservation` movement.
- Customer or admin cancellation increases available stock with a positive `release` movement.
- Admin fulfilment reduces `stock_on_hand` and `stock_reserved` by the same quantity. The ledger records a positive `release` and an equal negative `stock_out`; their net is zero because the reserved item was already excluded from available stock.
- Manual stock adjustments continue to be recorded by the existing owner-only admin mutation RPC.
- A reservation-only trigger deliberately skips updates where `stock_on_hand` changes in the same statement, preventing duplicate or incorrect movements during fulfilment.

The reconciliation migration fails closed if active order quantities do not match `stock_reserved`, if shipped/delivered orders exist before the historical fulfilment path is reviewed, or if existing movement history cannot be reconciled. It records opening/reservation audit rows only; it does not alter existing stock quantities.

Apply and test this migration in Staging first. Production remains unchanged until separately approved.
