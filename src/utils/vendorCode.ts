import VendorProfile from '../models/VendorProfile';

export const generateVendorCode = async (businessName: string): Promise<string> => {
  const initials = businessName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? 'X')
    .join('');

  for (let i = 0; i < 10; i++) {
    const digits = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `${initials}-${digits}`;
    const exists = await VendorProfile.findOne({ vendorCode: code });
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique vendor code after 10 attempts');
};
