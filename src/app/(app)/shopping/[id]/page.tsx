import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getShoppingListAction } from "@/app/actions/shopping";
import { DeleteListButton } from "../delete-list-button";
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

      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">{list.name}</h1>
        <DeleteListButton
          listId={list.id}
          name={list.name}
          redirectTo="/shopping"
        />
      </div>

      <ShoppingListView list={list} />
    </div>
  );
}
