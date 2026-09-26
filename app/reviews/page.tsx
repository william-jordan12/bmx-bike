import type { Metadata } from "next";
import ReviewsPage from "@/components/reviews-page";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description:
    "Read customer reviews for RIDE//BMX complete BMX bikes: star ratings for the whole catalog plus written rider reviews from freestyle, race, cruiser, and kids bikes."
};

export default function CustomerReviewsPage() {
  return <ReviewsPage />;
}
