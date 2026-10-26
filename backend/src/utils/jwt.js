import jwt from 'jsonwebtoken';

/**
 * Sign a JWT for a given user id.
 */
export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export default signToken;
