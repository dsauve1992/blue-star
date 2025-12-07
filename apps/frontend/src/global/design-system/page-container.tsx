import * as React from "react";
import { cn } from "./utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * If true, removes max-width constraint for full-width layouts
     */
    fullWidth?: boolean;
    /**
     * If true, removes padding for edge-to-edge content
     */
    noPadding?: boolean;
}

/**
 * PageContainer provides consistent page-level spacing and max-width constraints.
 * Use this component at the root of page components to maintain layout consistency.
 * 
 * @example
 * // Default behavior with padding and max-width
 * <PageContainer>
 *   <h1>My Page</h1>
 * </PageContainer>
 * 
 * @example
 * // Full-width layout (no max-width constraint)
 * <PageContainer fullWidth>
 *   <Dashboard />
 * </PageContainer>
 * 
 * @example
 * // No padding (for pages that manage their own spacing)
 * <PageContainer noPadding>
 *   <CustomLayout />
 * </PageContainer>
 */
export function PageContainer({
    className,
    fullWidth = false,
    noPadding = false,
    children,
    ...props
}: PageContainerProps) {
    return (
        <div
            className={cn(
                "w-full",
                !noPadding && "p-6",
                !fullWidth && "max-w-7xl mx-auto",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
