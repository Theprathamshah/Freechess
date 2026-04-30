export interface Env {
  FREECHESS_API_BASE_URL: string;
  ANALYSIS_WORKER_TOKEN: string;
}

export default {
  async scheduled(
    _controller: unknown,
    env: Env,
    _ctx: unknown
  ): Promise<void> {
    await fetch(`${env.FREECHESS_API_BASE_URL}/api/analysis/worker`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ANALYSIS_WORKER_TOKEN}`,
      },
    });
  },
};
