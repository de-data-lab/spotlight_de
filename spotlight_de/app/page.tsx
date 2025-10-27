"use client";
import dynamic from "next/dynamic";

const DelawareMap = dynamic(() => import("../components/DelawareMap"), {
  ssr: false,
});

export default function HomePage() {
  return <DelawareMap />;
}
