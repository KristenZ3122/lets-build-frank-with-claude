import { useEffect, useState } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { Overview } from "./pages/Overview";
import { Tools } from "./pages/Tools";

// Hash routing: Frank serves static files and nothing else at /, so every
// route must resolve to index.html without server-side rewrites.
const PAGES = {
  "#/": { title: "Overview", render: () => <Overview /> },
  "#/tools": { title: "Tools", render: () => <Tools /> },
} as const;

type Route = keyof typeof PAGES;

function currentRoute(): Route {
  return window.location.hash in PAGES ? (window.location.hash as Route) : "#/";
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <AppLayout
      navigation={
        <SideNavigation
          header={{ text: "Frank", href: "#/" }}
          activeHref={route}
          items={Object.entries(PAGES).map(([href, page]) => ({ type: "link", text: page.title, href }))}
        />
      }
      toolsHide
      content={PAGES[route].render()}
    />
  );
}
