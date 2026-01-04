import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getShoppingListAction } from "@/app/actions/shopping";
import { ShoppingListView } from "./shopping-list-view";

export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await getShoppingListAction(id);

  if (!list) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/shopping"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do list
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">{list.name}</h1>

      <ShoppingListView list={list} />
    </div>
  );
}
