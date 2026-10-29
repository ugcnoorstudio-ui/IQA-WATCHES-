-- Cover the actor foreign key for cleanup and audit administration queries.
CREATE INDEX IF NOT EXISTS admin_mutation_idempotency_actor_idx ON private.admin_mutation_idempotency(actor);
