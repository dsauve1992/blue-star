import { useEffect, useState, type RefObject } from "react";

export function useInViewOnce(
  targetRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  rootMargin = "400px 0px",
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (inView || !target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { root: rootRef.current, rootMargin },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [inView, targetRef, rootRef, rootMargin]);

  return inView;
}
