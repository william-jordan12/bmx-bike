import type { Metadata } from "next";
import Storefront from "@/components/storefront";

export const metadata: Metadata = {
  title: "Complete BMX Bikes",
  description:
    "Explore freestyle, race, cruiser, and youth BMX bikes from Kink, Sunday, Wethepeople, Cult, Fit Bike Co, and more."
};

export default function BmxBikesPage() {
  return <Storefront />;
}
