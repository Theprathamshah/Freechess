import { InsightsDashboard } from "@/sections/insights/InsightsDashboard";
import Head from "next/head";

export default function InsightsPage() {
  return (
    <>
      <Head>
        <title>Chess Insights | Freechess</title>
        <meta
          name="description"
          content="In-depth analysis of your chess performance — accuracy, openings, move quality, and more. Free, local, and private."
        />
      </Head>
      <InsightsDashboard />
    </>
  );
}
