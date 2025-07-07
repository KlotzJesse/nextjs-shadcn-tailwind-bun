import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconListDetails, IconFolder } from "@tabler/icons-react";
import Link from "next/link";

export const experimental_ppr = true;

export default function HomePage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to KRAUSS Territory Management
          </h1>
          <p className="text-muted-foreground">
            Professional territory management and visualization platform for
            Germany
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconListDetails className="w-5 h-5" />
                German States
              </CardTitle>
              <CardDescription>
                View and manage German federal states and regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Interactive map for managing German states with selection tools
                and search functionality.
              </p>
              <Button asChild className="w-full">
                <Link href="/states">Open States Management</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFolder className="w-5 h-5" />
                Postal Codes
              </CardTitle>
              <CardDescription>
                Manage postal code regions with multiple granularity levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Interactive postal code management with 1-5 digit granularity
                options and search capabilities.
              </p>
              <Button asChild className="w-full">
                <Link href="/postal-codes">Open Postal Codes Management</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent territory management activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No recent activity to display. Start by exploring the states or
                postal codes management tools.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
