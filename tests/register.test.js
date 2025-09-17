import request from 'supertest';
import app from '../app.js';
import jwt from 'jsonwebtoken';

let token;
let accessToken;
let refreshToken;
let newAccessToken;
let userId;

/*
Note : For these tests to run successfully, ensure that:
use a valid email 


*/


describe('User Registration and Verification', () => {
    
    it('should register a new user and send verification email', async () => {
        const userData = {
            email: 'testuser@gmail.com',
            password: '12345678',
            first_name: 'John',
            last_name: 'Doe',
            phone_number: '1234567890'
        };
        const response = await request(app).post('/api/auth/register').send(userData);
        token=response.body.token;
        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Registration successful, verification email sent.')
        expect(response.body.token).toBeDefined();
    });
    it('should verify the user email', async () => {
        const response = await request(app).get(`/api/auth/verify/${token}`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Email verified successfully.');
    });


})

describe('User Login and Token Refreshment ',()=>{

    it('should login the user and return access and refresh tokens',async()=>{
        const loginData={
            email: 'testuser@gmail.com',
            password: '12345678'
        };
        const response=await request(app).post('/api/auth/login').send(loginData);
        accessToken=response.body.accessToken;
        refreshToken=response.body.refreshToken;
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
    });
    it('should refresh the access token using the refresh token',async()=>{
        const response=await request(app).post('/api/auth/refresh-token').send({refreshToken:refreshToken});
        newAccessToken=response.body.accessToken;
        expect(response.status).toBe(200);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.message).toBe('Access token refreshed');
    });

})

describe('User Profile Management',()=>{
    it('should get all users',async()=>{
        const response=await request(app).get('/api/auth/users')
        .set('Authorization', `Bearer ${newAccessToken}`);
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
    it('should get user by ID',async()=>{
        const payload = jwt.decode(newAccessToken);
        userId = payload.userId;
        const response=await request(app).get(`/api/auth/users/${userId}`)
        .set('Authorization', `Bearer ${newAccessToken}`);
        expect(response.status).toBe(200);

        expect(response.body.id).toEqual(userId);
    });
    it('should update user details',async()=>{
        const updates={
            first_name: 'Jane',
            last_name:'Smith',
            phone_number:'0987654321',
            email:'jane@example.com'
        };
        if (updates.email === undefined) {
            const response=await request(app).put(`/api/auth/users/${userId}`)
            .set('Authorization', `Bearer ${newAccessToken}`)
            .send(updates);
            expect(response.status).toBe(200);
            expect(response.body.first_name).toBe(updates.first_name);
            expect(response.body.last_name).toBe(updates.last_name);
            expect(response.body.phone_number).toBe(updates.phone_number);    
        }else{
            const response=await request(app).put(`/api/auth/users/${userId}`)
            .set('Authorization', `Bearer ${newAccessToken}`)
            .send(updates);
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Email cannot be updated. Please contact administrator for email changes.');
        }

    });
    it('should delete the user',async()=>{
        const response=await request(app).delete(`/api/auth/users/${userId}`)
        .set('Authorization', `Bearer ${newAccessToken}`);
        expect(response.status).toBe(204);
    });
    it('should logout the user',async()=>{
        const response=await request(app).post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Logged out successfully');
    });
    
})

  