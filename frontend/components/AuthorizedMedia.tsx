"use client";

import { useEffect, useState } from "react";

export function AuthorizedImage({ src, alt, className, token }: { src: string; alt: string; className?: string; token: string }) {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!src || !token) return;
    let url = "";
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.blob();
      })
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch((err) => console.error(err));

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, token]);

  if (!objectUrl) return <div className={`animate-pulse bg-gray-800 ${className}`} />;

  return <img src={objectUrl} alt={alt} className={className} />;
}

export function AuthorizedLink({ href, children, className, token }: { href: string; children: React.ReactNode; className?: string; token: string }) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!href || !token) return;
    try {
      const res = await fetch(href, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const disposition = res.headers.get("content-disposition");
      let filename = "download";
      if (disposition && disposition.indexOf("filename=") !== -1) {
        filename = disposition.split("filename=")[1].replace(/["']/g, "");
      } else {
        const parts = href.split("?path=");
        if (parts.length > 1) {
            const pathParts = decodeURIComponent(parts[1]).split(/[\\/]/);
            filename = pathParts[pathParts.length - 1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <a href={href} onClick={handleDownload} className={className}>
      {children}
    </a>
  );
}
