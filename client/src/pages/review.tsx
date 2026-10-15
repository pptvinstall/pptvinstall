import { ReviewCTA } from "@/components/ui/ReviewCTA";

// Short link to text customers after a finished job: pptvinstall.com/review
export default function ReviewPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4 pb-16 pt-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Thanks for choosing Picture Perfect TV Install</h1>
          <p className="mt-2 text-slate-600">It was a pleasure working on your setup.</p>
        </div>
        <ReviewCTA />
      </div>
    </div>
  );
}
