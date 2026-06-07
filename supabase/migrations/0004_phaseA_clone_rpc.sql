-- Phase A: atomic template-clone RPC stub
-- Apply manually (supabase db push / SQL editor).
-- Full implementation lands in Phase B; this stub establishes the signature.

CREATE OR REPLACE FUNCTION clone_template_to_tenant(template_id uuid, tenant_id uuid)
RETURNS void AS $$
BEGIN
  -- TODO: Implement full atomic clone in Phase B
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
