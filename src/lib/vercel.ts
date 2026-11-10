export type Proyecto = { nombre: string; estado: string; url: string | null; cuando: number | null; rama: string | null };

/** Último despliegue de producción de cada proyecto. */
export async function despliegues(): Promise<Proyecto[]> {
  const team = process.env.VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  const r = await fetch(`https://api.vercel.com/v9/projects?limit=30${team}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Vercel ${r.status}`);
  const j = (await r.json()) as {
    projects: { name: string; latestDeployments?: { readyState: string; url: string; createdAt: number; target?: string | null; meta?: { githubCommitRef?: string } }[] }[];
  };
  return j.projects
    .map((p) => {
      const ds = p.latestDeployments ?? [];
      const d = ds.find((x) => x.target === "production") ?? ds[0];
      return { nombre: p.name, estado: d?.readyState ?? "SIN DESPLIEGUES", url: d ? `https://${d.url}` : null, cuando: d?.createdAt ?? null, rama: d?.meta?.githubCommitRef ?? null };
    })
    .sort((a, b) => (b.cuando ?? 0) - (a.cuando ?? 0));
}
