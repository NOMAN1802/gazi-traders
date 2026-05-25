import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { DashboardServices } from "./dashboard.service";

const getDashboard = catchAsync(async (req, res) => {
  const { role } = req.user;
  const { startDate, endDate } = req.query;

  let result;

  if (role === "admin") {
    result = await DashboardServices.getAdminDashboard(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
  } else if (role === "manager") {
    result = await DashboardServices.getManagerDashboard(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
  } else {
    result = await DashboardServices.getStaffDashboard();
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard data retrieved successfully",
    data: result,
  });
});

export const DashboardControllers = {
  getDashboard,
};
