import type { NextFunction, Request, Response } from "express";
import { success } from "zod";

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        })
    }

    next()
};