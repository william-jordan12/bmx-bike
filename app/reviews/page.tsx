import type { Metadata } from "next";
import ReviewsPage from "@/components/reviews-page";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description:
    "Read written rider reviews for RIDE//BMX complete BMX bikes: every star rating on this page comes from a review a customer actually wrote about freestyle, race, cruiser, and kids bikes."
};

export default function CustomerReviewsPage() {
  return <ReviewsPage />;
}
