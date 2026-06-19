import { Calendar, ChefHat, ShoppingCart, Shuffle, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { Button, Card, CardContent } from "@/components/ui";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/today");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-background to-background dark:from-orange-950/25">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <span className="bg-brand-gradient mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-warm-lg">
            <ChefHat className="h-10 w-10" />
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-4">
            co <span className="text-gradient-brand">jemy?</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Planuj posiłki dla całej rodziny. Losuj dania, twórz jadłospisy i
            generuj listy zakupów - wszystko w jednym miejscu.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg">Zacznij za darmo</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg">
                Zaloguj się
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6">
              <div className="bg-brand-gradient w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-warm">
                <Shuffle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Losuj dania
              </h3>
              <p className="text-muted-foreground">
                Koniec z pytaniem &quot;co na obiad?&quot;. Wylosuj danie z
                filtrami - wegetariańskie, szybkie, dla dzieci i więcej.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Planuj tydzień
              </h3>
              <p className="text-muted-foreground">
                Zaplanuj posiłki na cały tydzień. Śniadania, obiady, kolacje i
                przekąski - wszystko pod kontrolą.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Lista zakupów
              </h3>
              <p className="text-muted-foreground">
                Automatycznie generuj listę zakupów z zaplanowanych posiłków.
                Składniki są grupowane i sumowane.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Profile rodzinne
              </h3>
              <p className="text-muted-foreground">
                Każdy domownik ma własny plan i cele kaloryczne. Jak Netflix,
                tylko dla jedzenia.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-muted-foreground text-sm">
          <p>Stworzone z ❤️ dla rodzin, które nie wiedzą co dziś zjeść.</p>
        </div>
      </div>
    </div>
  );
}
