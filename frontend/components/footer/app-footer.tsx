import Image from "next/image";

export const AppFooter = () => {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 px-4 py-6">
        <p className="text-sm text-muted-foreground text-center">
          Build and designed by Daria Rosen
        </p>
        <div className="flex items-center justify-center">
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-muted-foreground"
          >
            <path
              d="M4 0L8 4L4 8L0 4L4 0Z"
              fill="currentColor"
              className="opacity-60"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          All rights reserved to{" "}
        </p>
        <p>
          <span className="inline-flex items-center gap-1.5">
            <Image
              src="/CereBi.PNG"
              alt="CereBi"
              width={60}
              height={60}
              className="inline-block w-auto mt-1"
            />
          </span>
        </p>
      </div>
    </footer>
  );
};
