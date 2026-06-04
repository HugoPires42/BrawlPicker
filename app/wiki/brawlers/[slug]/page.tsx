"use client";
import { use } from "react";
import BrawlerDetail from "@/components/BrawlerDetail";

export default function BrawlerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <BrawlerDetail slug={slug} showBackLink />;
}
