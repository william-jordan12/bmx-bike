import type { Metadata } from "next";
import ShopPage from "@/components/shop-page";

export const metadata: Metadata = {
  title: "Shop Complete Bikes, Parts & Apparel",
  description:
    "Browse every RIDE//BMX department: freestyle, race, cruiser, and kids complete bikes plus parts, apparel, accessories, and the brands we stock."
};

export default function ShopIndexPage() {
  return <ShopPage />;
}
