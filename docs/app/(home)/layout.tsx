import type { ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/app/layout.config";
import { BookIcon, RocketIcon } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      {...baseOptions}
      links={[
        {
          icon: <BookIcon />,
          on: "nav",
          text: "Documentation",
          url: "/docs",
          label: "Documentation",
          secondary: false,
        },
        // {
        //   icon: <RocketIcon />,
        //   on: "all",
        //   text: "Playground",
        //   url: "/playground",
        //   label: "Playground",
        //   secondary: false,
        // }
      ]}
    >
      {children}
    </HomeLayout>
  );
}
