import type { Metadata } from "next";

import { Checkpoint } from "./Checkpoint";

export const metadata: Metadata = {
  title: "Project Checkpoint",
};

export default function CheckpointPage() {
  return <Checkpoint />;
}
