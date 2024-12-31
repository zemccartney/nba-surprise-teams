import type { ReactNode } from "react";
import * as RadixPopover from "@radix-ui/react-popover";

export const styles = {
  body: "w-48 bg-cyan-500 p-2 font-mono text-sm text-slate-950 ring-2 ring-indigo-400",
};

export default function Popover({ children }: { children: ReactNode }) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger className="font-mono text-lg">
        ?
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          avoidCollisions
          hideWhenDetached
          className={styles.body}
        >
          {children}
          <RadixPopover.Close
            aria-label="Close"
            className="shadow-sm:hover absolute right-4 top-4 font-mono text-lg text-indigo-500 shadow-slate-950"
          >
            X
          </RadixPopover.Close>
          <RadixPopover.Arrow className="fill-cyan-500" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
