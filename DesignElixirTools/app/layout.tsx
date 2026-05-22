import type { Metadata } from "next";
import "./backend.css";
import Navigation from "./components/Navigation";
import { TrackingProvider } from "./context/TrackingContext";
import { TimeTrackerProvider } from "./context/TimeTrackerContext";
import { TimeEntriesProvider } from "./context/TimeEntriesContext";
import TimeTrackerWrapper from "./time-tracking/TimeTrackerWrapper";
import { auth } from "@/auth";
import Login from "@/app/components/Login";

export const metadata: Metadata = {
  title: "Design Elixir Tools",
  description: "Tools I needed but couldn't find",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()

  if (!session) {
    return (
    <html className="full-width">
      <body className="flex-center-center full-width">
        <Login />
      </body>

      </html>

    )
  }

  return (
    <html>
      <body className="flex-start-start">
        <TrackingProvider>
          <TimeTrackerProvider>
            <TimeEntriesProvider>
              <Navigation />
              <main>
                <TimeTrackerWrapper />
                <section className="flex-start-start flex-column full-width">
                  {children}
                </section>
              </main>
            </TimeEntriesProvider>
          </TimeTrackerProvider>
        </TrackingProvider>
      </body>
    </html>
  );
}