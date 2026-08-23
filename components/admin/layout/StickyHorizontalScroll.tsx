"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type StickyHorizontalScrollProps = {
  children: ReactNode;
  className?: string;
};

export default function StickyHorizontalScroll({
  children,
  className = "",
}: StickyHorizontalScrollProps) {
  const wrapperRef =
    useRef<HTMLDivElement | null>(null);

  const contentRef =
    useRef<HTMLDivElement | null>(null);

  const floatingScrollRef =
    useRef<HTMLDivElement | null>(null);

  const syncingRef =
    useRef(false);

  const [contentWidth, setContentWidth] =
    useState(0);

  const [visibleWidth, setVisibleWidth] =
    useState(0);

  const [
    horizontalOverflow,
    setHorizontalOverflow,
  ] = useState(false);

  const [
    showFloatingScrollbar,
    setShowFloatingScrollbar,
  ] = useState(false);

  const [
    floatingLeft,
    setFloatingLeft,
  ] = useState(0);

  const measure =
    useCallback(() => {
      const wrapper =
        wrapperRef.current;

      const content =
        contentRef.current;

      if (
        !wrapper ||
        !content
      ) {
        return;
      }

      const scrollWidth =
        content.scrollWidth;

      const clientWidth =
        content.clientWidth;

      const rect =
        content.getBoundingClientRect();

      setContentWidth(
        scrollWidth,
      );

      setVisibleWidth(
        clientWidth,
      );

      setFloatingLeft(
        rect.left,
      );

      const hasOverflow =
        scrollWidth >
        clientWidth + 1;

      setHorizontalOverflow(
        hasOverflow,
      );

      if (!hasOverflow) {
        setShowFloatingScrollbar(
          false,
        );

        return;
      }

      const wrapperRect =
        wrapper.getBoundingClientRect();

      const viewportHeight =
        window.innerHeight;

      /*
       * La barre flottante apparaît si :
       *
       * - le tableau est visible ;
       * - il dépasse horizontalement ;
       * - le bas du tableau n'est pas
       *   encore visible.
       */
      const tableIsVisible =
        wrapperRect.top <
          viewportHeight &&
        wrapperRect.bottom >
          0;

      const bottomNotReached =
        wrapperRect.bottom >
        viewportHeight;

      setShowFloatingScrollbar(
        tableIsVisible &&
          bottomNotReached,
      );
    }, []);

  useEffect(() => {
    measure();

    const resizeObserver =
      new ResizeObserver(
        () => {
          measure();
        },
      );

    if (
      wrapperRef.current
    ) {
      resizeObserver.observe(
        wrapperRef.current,
      );
    }

    if (
      contentRef.current
    ) {
      resizeObserver.observe(
        contentRef.current,
      );

      if (
        contentRef.current
          .firstElementChild
      ) {
        resizeObserver.observe(
          contentRef.current
            .firstElementChild,
        );
      }
    }

    window.addEventListener(
      "resize",
      measure,
    );

    window.addEventListener(
      "scroll",
      measure,
      {
        passive: true,
      },
    );

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        measure,
      );

      window.removeEventListener(
        "scroll",
        measure,
      );
    };
  }, [measure]);

  function handleContentScroll() {
    if (
      syncingRef.current
    ) {
      return;
    }

    const content =
      contentRef.current;

    const floating =
      floatingScrollRef.current;

    if (
      !content ||
      !floating
    ) {
      return;
    }

    syncingRef.current =
      true;

    floating.scrollLeft =
      content.scrollLeft;

    requestAnimationFrame(
      () => {
        syncingRef.current =
          false;
      },
    );
  }

  function handleFloatingScroll() {
    if (
      syncingRef.current
    ) {
      return;
    }

    const content =
      contentRef.current;

    const floating =
      floatingScrollRef.current;

    if (
      !content ||
      !floating
    ) {
      return;
    }

    syncingRef.current =
      true;

    content.scrollLeft =
      floating.scrollLeft;

    requestAnimationFrame(
      () => {
        syncingRef.current =
          false;
      },
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
    >
      <div
        ref={contentRef}
        onScroll={
          handleContentScroll
        }
        className="overflow-x-auto"
      >
        {children}
      </div>

      {horizontalOverflow &&
        showFloatingScrollbar && (
          <div
            className="fixed bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.12)] backdrop-blur"
            style={{
              left:
                `${floatingLeft}px`,

              width:
                `${visibleWidth}px`,
            }}
          >
            <div className="flex items-center justify-between px-3 py-1 text-[10px] font-medium text-slate-400">
              <span>
                ← Défiler le tableau
              </span>

              <span>
                Défiler →
              </span>
            </div>

            <div
              ref={
                floatingScrollRef
              }
              onScroll={
                handleFloatingScroll
              }
              className="overflow-x-auto"
            >
              <div
                style={{
                  width:
                    `${contentWidth}px`,

                  height:
                    "1px",
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
}