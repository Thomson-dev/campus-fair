import { Request, Response } from 'express';
import Event from '../models/Event';

// ── List all events (public) ──────────────────────────────────────────────────

export const listEvents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await Event.find()
      .sort({ date: -1 })
      .populate('organizer', 'name')
      .populate('vendors', 'businessName category photo vendorCode');
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Get single event (public) ─────────────────────────────────────────────────

export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params['id'])
      .populate('organizer', 'name institution')
      .populate({ path: 'vendors', select: '-bankDetails', populate: { path: 'user', select: 'name' } });
    if (!event) { res.status(404).json({ success: false, message: 'Event not found' }); return; }
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Create event (organizer only) ─────────────────────────────────────────────

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, date, location } = req.body as Record<string, string>;
    const event = await Event.create({ name, date: new Date(date), location, organizer: req.user!._id });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Update event (organizer only) ─────────────────────────────────────────────

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params['id'], organizer: req.user!._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!event) { res.status(404).json({ success: false, message: 'Event not found or not yours' }); return; }
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Add vendor to event (organizer only) ──────────────────────────────────────

export const addVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.body as { vendorId: string };
    const event = await Event.findOneAndUpdate(
      { _id: req.params['id'], organizer: req.user!._id },
      { $addToSet: { vendors: vendorId } },
      { new: true }
    );
    if (!event) { res.status(404).json({ success: false, message: 'Event not found or not yours' }); return; }
    res.json({ success: true, vendors: event.vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

// ── Remove vendor from event (organizer only) ─────────────────────────────────

export const removeVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params['id'], organizer: req.user!._id },
      { $pull: { vendors: req.params['vendorId'] } },
      { new: true }
    );
    if (!event) { res.status(404).json({ success: false, message: 'Event not found or not yours' }); return; }
    res.json({ success: true, vendors: event.vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};
