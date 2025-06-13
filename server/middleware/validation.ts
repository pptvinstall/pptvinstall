
export const validateBookingData = (req: any, res: any, next: any) => {
  try {
    // Ensure required fields are present
    const requiredFields = ['name', 'email', 'phone', 'streetAddress', 'city', 'state', 'zipCode'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate phone number format
    const phone = req.body.phone.replace(/\D/g, '');
    if (phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be at least 10 digits'
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid request data'
    });
  }
};
