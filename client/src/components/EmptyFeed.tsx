import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const EmptyFeed = () => (
  <div className="bg-neutral-50 rounded-2xl shadow p-8 max-w-md mx-auto flex flex-col items-center justify-center text-center" aria-label="Empty feed state">
    <Ghost className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mb-4" aria-hidden="true" />
    <h2 className="text-2xl font-bold text-neutral-700 dark:text-neutral-100 mb-2">Your feed is quiet</h2>
    <p className="text-neutral-500 dark:text-neutral-300 mb-6">Follow someone or create your first post to see activity here.</p>
    <Button asChild className="focus-visible:outline-primary-500">
      <Link href="/explore">Explore people</Link>
    </Button>
  </div>
);

export default EmptyFeed; 