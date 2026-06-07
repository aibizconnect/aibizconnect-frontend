"use client";

import { use, useEffect, useState } from "react";
import PipelineColumn from "@/components/crm/PipelineColumn";
import CreateDealModal from "@/components/crm/CreateDealModal";

export default function PipelineDetailPage({
  params
}: {
  params: Promise<{ tenantId: string; pipelineId: string }>;
}) {
  const { tenantId, pipelineId } = use(params);

  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);

  function load() {
    fetch(`/tenants/${tenantId}/pipelines`)
      .then(res => res.json())
      .then(data => {
        const pipeline = data.pipelines.find((p: any) => p.id === pipelineId);
        setStages(pipeline.stages || []);
      });

    fetch(`/tenants/${tenantId}/deals`)
      .then(res => res.json())
      .then(data => setDeals(data.deals || []));
  }

  useEffect(() => {
    load();
  }, [tenantId, pipelineId]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Pipeline</h1>

      <div style={{ display: "flex", gap: 16 }}>
        {stages.map(stage => (
          <div key={stage.id}>
            <PipelineColumn
              stage={stage}
              deals={deals.filter(d => d.stage_id === stage.id)}
            />

            <CreateDealModal
              tenantId={tenantId}
              pipelineId={pipelineId}
              stageId={stage.id}
              onCreated={load}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
