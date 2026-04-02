"use client";

import { use } from "react";
import VisitBookingDetailClient from "@/components/visits/VisitBookingDetailClient";

export default function VisitBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <VisitBookingDetailClient bookingId={id} />;
}
