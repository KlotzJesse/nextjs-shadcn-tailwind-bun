import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IconFolder } from "@tabler/icons-react";
import Link from "next/link";

export const experimental_ppr = true;

export default function HomePage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Willkommen bei KRAUSS Gebietsmanagement
          </h1>
          <p className="text-muted-foreground">
            Professionelle Plattform für Gebietsmanagement und Visualisierung in
            Deutschland
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFolder className="w-5 h-5" />
                Postleitzahlen
              </CardTitle>
              <CardDescription>
                Verwaltung von Postleitzahlgebieten mit verschiedenen
                Granularitätsstufen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Interaktive Verwaltung der Postleitzahlen mit 1- bis 5-stelliger
                Granularität und Suchfunktion.
              </p>
              <Button asChild className="w-full">
                <Link href="/postal-codes">Postleitzahlen verwalten</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <CardDescription>
                Ihre letzten Aktivitäten im Gebietsmanagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Keine letzten Aktivitäten vorhanden. Starten Sie mit der
                Verwaltung der Bundesländer oder Postleitzahlen.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
