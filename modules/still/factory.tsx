import React from "react";
import { Still } from "./Still.tsx";

/** Still の要素ファクトリ。 */
export const still = (props: React.ComponentProps<typeof Still>) => (
  <Still {...props} />
);
