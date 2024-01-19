"use client";

import { Button } from "@/components/ui/button";

type Props = {};

const Startbuy = (props: Props) => {
  const startBuy = async () => {
    console.log("start");
    await fetch("/api/startBuy", { method: "POST" });
  };
  return (
    <div>
      <Button onClick={startBuy}>Click me</Button>
    </div>
  );
};

export default Startbuy;
