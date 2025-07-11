import type { ClassValue } from "clsx";
import type { ReactNode } from "react";

import * as RadixPopover from "@radix-ui/react-popover";
import Clsx from "clsx";

export const PopoverBody = ({
  children,
  className,
  deRadix = false,
}: {
  children: ReactNode;
  className?: ClassValue;
  deRadix?: boolean;
}) => {
  if (deRadix) {
    return (
      <div
        className={Clsx([
          "z-10 w-fit max-w-60 rounded-md bg-blue-200 p-2 font-mono text-lg text-slate-950",
          className,
        ])}
      >
        {children}
      </div>
    );
  }

  return (
    <RadixPopover.Content
      avoidCollisions
      className={Clsx([
        "z-10 w-fit max-w-60 rounded-md bg-blue-200 p-2 font-mono text-lg text-slate-950",
        className,
      ])}
      hideWhenDetached
    >
      {children}
    </RadixPopover.Content>
  );
};

export default function Popover({
  children,
  classes,
}: {
  children: ReactNode;
  classes?: Partial<Record<"arrow" | "body" | "close" | "trigger", ClassValue>>;
}) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger
        className={Clsx([
          "absolute top-0 right-2 cursor-pointer font-mono text-base text-indigo-500 hover:text-indigo-300 md:text-lg",
          classes?.trigger,
        ])}
      >
        ?
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <PopoverBody {...(classes?.body && { className: classes.body })}>
          {children}
          <RadixPopover.Close
            aria-label="Close"
            className={Clsx([
              "shadow-sm:hover absolute top-0 right-2 cursor-pointer font-mono text-lg text-indigo-500 shadow-slate-950",
              classes?.close,
            ])}
          >
            x
          </RadixPopover.Close>
          <RadixPopover.Arrow
            className={Clsx(["fill-blue-200", classes?.arrow])}
          />
        </PopoverBody>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
