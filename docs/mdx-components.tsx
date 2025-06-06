import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { TypeTable } from "fumadocs-ui/components/type-table";
import { examples } from "./lib/components/examples"

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    TypeTable,
    ...examples,
    ...components,
  };
}
