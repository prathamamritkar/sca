import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
    /** Whether to show the text alongside the icon */
    showText?: boolean;
    /** Size variant for the logo */
    size?: "sm" | "md" | "lg";
    /** Optional link destination - if not provided, renders without link wrapper */
    linkTo?: string;
    /** Theme variant for different backgrounds */
    variant?: "default" | "dark" | "light";
    /** Additional classes for the container */
    className?: string;
}

/**
 * Consistent Logo component for Sustainable Campus Automation
 * Used across all pages for brand consistency
 */
const Logo = ({
    showText = true,
    size = "md",
    linkTo = "/",
    variant = "default",
    className
}: LogoProps) => {

    const sizeConfig = {
        sm: {
            icon: "w-8 h-8 rounded-lg",
            iconInner: "w-4 h-4",
            textPrimary: "text-sm font-black tracking-[0.05em]",
            textSecondary: "text-[10px] font-bold tracking-[0.1em]"
        },
        md: {
            icon: "w-10 h-10 rounded-xl",
            iconInner: "w-6 h-6",
            textPrimary: "text-lg font-black tracking-[0.05em]",
            textSecondary: "text-[12px] font-bold tracking-[0.1em]"
        },
        lg: {
            icon: "w-12 h-12 rounded-xl",
            iconInner: "w-7 h-7",
            textPrimary: "text-xl font-black tracking-[0.05em]",
            textSecondary: "text-sm font-bold tracking-[0.1em]"
        }
    };

    const variantConfig = {
        default: {
            iconBg: "bg-primary",
            iconColor: "text-white",
            textPrimary: "text-slate-900",
            textSecondary: "text-slate-500"
        },
        dark: {
            iconBg: "bg-primary",
            iconColor: "text-white",
            textPrimary: "text-white",
            textSecondary: "text-white/60"
        },
        light: {
            iconBg: "bg-primary",
            iconColor: "text-white",
            textPrimary: "text-slate-900",
            textSecondary: "text-slate-400"
        }
    };

    const s = sizeConfig[size];
    const v = variantConfig[variant];

    const content = (
        <div className={cn("flex items-center gap-3 group", className)}>
            {/* Icon - Always the green rounded square with Leaf */}
            <div className={cn(
                s.icon,
                v.iconBg,
                "flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform"
            )}>
                <Leaf className={cn(s.iconInner, v.iconColor)} />
            </div>

            {/* Text */}
            {showText && (
                <div className="flex flex-col leading-[0.9]">
                    <span className={cn(s.textPrimary, v.textPrimary, "uppercase")}>
                        Sustainable
                    </span>
                    <span className={cn(s.textSecondary, v.textSecondary, "uppercase")}>
                        Campus Automation
                    </span>
                </div>
            )}
        </div>
    );

    // Wrap in Link if linkTo is provided
    if (linkTo) {
        return (
            <Link to={linkTo} aria-label="Sustainable Campus Automation - Home">
                {content}
            </Link>
        );
    }

    return content;
};

export default Logo;
