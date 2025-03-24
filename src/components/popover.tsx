import type { ClassValue } from "clsx";
import type { ReactNode } from "react";

import * as RadixPopover from "@radix-ui/react-popover";
import Clsx from "clsx";

export const styles = {
  arrow: "fill-indigo-500",
  body: "w-fit max-w-60 z-10 bg-cyan-500 p-2 font-mono text-md text-slate-950 ring-2 ring-indigo-500",
  close:
    "shadow-sm:hover absolute right-2 top-0 font-mono text-lg text-indigo-500 shadow-slate-950",
  trigger:
    "absolute right-2 top-0 font-mono text-base text-indigo-500 hover:text-indigo-300 md:text-lg",
};

export default function Popover({
  children,
  classes,
}: {
  children: ReactNode;
  classes?: Partial<Record<keyof typeof styles, ClassValue>>;
}) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger
        className={Clsx([styles.trigger, classes?.trigger])}
      >
        ?
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          avoidCollisions
          className={Clsx([styles.body, classes?.body])}
          hideWhenDetached
        >
          {children}
          <RadixPopover.Close
            aria-label="Close"
            className={Clsx([styles.close, classes?.close])}
          >
            x
          </RadixPopover.Close>
          <RadixPopover.Arrow
            className={Clsx([styles.arrow, classes?.arrow])}
          />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
