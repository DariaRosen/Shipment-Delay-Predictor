import Image from "next/image";

export const AppFooter = () => {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 px-4 py-6">
        <p className="text-sm text-muted-foreground text-center">
          Build and designed by Daria Rosen
        </p>
        <p className="text-sm text-muted-foreground text-center">
          All rights reserved to{" "}
          <span className="inline-flex items-center gap-1.5">
            <Image
              src="/CereBi.PNG"
              alt="CereBi"
              width={30}
              height={30}
              className="inline-block"
            />
          </span>
        </p>
      </div>
    </footer>
  );
};
