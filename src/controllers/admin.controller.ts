import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
  constructor(private adminService: AdminService) {}

  getAllUsers = async (req: Request, res: Response) => {
    const result = await this.adminService.getAllUsers();
    res.json(result);
  };

  updateUserRole = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    const result = await this.adminService.updateUserRole(id, role);
    res.json(result);
  };

  deleteUser = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const result = await this.adminService.deleteUser(id);
    res.json(result);
  };

  getStats = async (req: Request, res: Response) => {
    const result = await this.adminService.getStats();
    res.json(result);
  };

  getAllAppointments = async (req: Request, res: Response) => {
    const result = await this.adminService.getAllAppointments();
    res.json(result);
  };
}
