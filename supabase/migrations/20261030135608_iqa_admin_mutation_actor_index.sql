-- Cover the actor foreign key on the private idempotency table.
CREATE INDEX IF NOT EXISTS admin_mutation_requests_actor_idx
  ON private.admin_mutation_requests(actor);
