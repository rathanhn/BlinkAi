
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M3.5 7C5.5 4.5 8.5 3 12 3C15.5 3 18.5 4.5 20.5 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M3.5 17C5.5 19.5 8.5 21 12 21C15.5 21 18.5 19.5 20.5 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Google</title>
        <path
          d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.66 2.03-3.86 0-6.99-3.11-6.99-7s3.13-7 6.99-7c2.18 0 3.54.88 4.38 1.69l2.66-2.59C18.43 1.7 15.98 0 12.48 0 5.88 0 0 5.96 0 12.48s5.88 12.48 12.48 12.48c7.04 0 12.09-4.81 12.09-12.2a12.02 12.02 0 00-.15-1.83z"
          fill="currentColor"
        />
      </svg>
    );
  }
