<?php

namespace App\Tests\Unit\Controller;

use App\Controller\PasswordResetController;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\EmailService;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class PasswordResetControllerTest extends TestCase
{
    private UserRepository $userRepository;
    private UserPasswordHasherInterface $passwordHasher;
    private ValidatorInterface $validator;
    private EmailService $emailService;
    private PasswordResetController $controller;

    protected function setUp(): void
    {
        $this->userRepository = $this->createMock(UserRepository::class);
        $this->passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $this->validator = $this->createMock(ValidatorInterface::class);
        $this->emailService = $this->createMock(EmailService::class);

        $this->controller = new PasswordResetController(
            $this->userRepository,
            $this->passwordHasher,
            $this->validator,
            $this->emailService
        );

        // Set up a mock container for AbstractController
        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturn(false);
        $this->controller->setContainer($container);
    }

    // =========================================================================
    // requestReset tests
    // =========================================================================

    public function testRequestResetReturnsBadRequestWhenEmailMissing(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([]));

        $response = $this->controller->requestReset($request);

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Email is required', $data['error']);
        $this->assertEquals('MISSING_EMAIL', $data['code']);
    }

    public function testRequestResetReturnsSuccessWhenUserNotFound(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['email' => 'nonexistent@example.com']));

        $this->userRepository
            ->expects($this->once())
            ->method('findByEmail')
            ->with('nonexistent@example.com')
            ->willReturn(null);

        $response = $this->controller->requestReset($request);

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('If an account exists', $data['message']);
    }

    public function testRequestResetReturnsSuccessForSuspendedUser(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['email' => 'suspended@example.com']));

        $user = $this->createMock(User::class);
        $user->method('getStatus')->willReturn(User::STATUS_SUSPENDED);

        $this->userRepository
            ->expects($this->once())
            ->method('findByEmail')
            ->willReturn($user);

        $response = $this->controller->requestReset($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testRequestResetReturnsSuccessForDeletedUser(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['email' => 'deleted@example.com']));

        $user = $this->createMock(User::class);
        $user->method('getStatus')->willReturn(User::STATUS_DELETED);

        $this->userRepository
            ->expects($this->once())
            ->method('findByEmail')
            ->willReturn($user);

        $response = $this->controller->requestReset($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testRequestResetSendsEmailForActiveUser(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['email' => 'active@example.com']));

        $user = $this->createMock(User::class);
        $user->method('getStatus')->willReturn(User::STATUS_ACTIVE);
        $user->method('getEmail')->willReturn('active@example.com');
        $user->expects($this->once())->method('setPasswordResetToken');
        $user->expects($this->once())->method('setPasswordResetTokenExpiresAt');

        $this->userRepository
            ->expects($this->once())
            ->method('findByEmail')
            ->willReturn($user);

        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($user);

        $this->emailService
            ->expects($this->once())
            ->method('sendPasswordResetEmail')
            ->with(
                'active@example.com',
                $this->callback(function ($url) {
                    return str_contains($url, '/password-reset/confirm?token=');
                })
            );

        $response = $this->controller->requestReset($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testRequestResetHandlesEmailException(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['email' => 'active@example.com']));

        $user = $this->createMock(User::class);
        $user->method('getStatus')->willReturn(User::STATUS_ACTIVE);
        $user->method('getEmail')->willReturn('active@example.com');

        $this->userRepository
            ->method('findByEmail')
            ->willReturn($user);

        $this->emailService
            ->method('sendPasswordResetEmail')
            ->willThrowException(new \Exception('Mail server error'));

        $response = $this->controller->requestReset($request);

        // Should still return success (security best practice)
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    // =========================================================================
    // verifyToken tests
    // =========================================================================

    public function testVerifyTokenReturnsBadRequestWhenTokenMissing(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([]));

        $response = $this->controller->verifyToken($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('MISSING_TOKEN', $data['code']);
    }

    public function testVerifyTokenReturnsBadRequestForInvalidToken(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['token' => 'invalid-token']));

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->with('invalid-token')
            ->willReturn(null);

        $response = $this->controller->verifyToken($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('INVALID_TOKEN', $data['code']);
    }

    public function testVerifyTokenReturnsBadRequestForExpiredToken(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['token' => 'expired-token']));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(true);

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $response = $this->controller->verifyToken($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('INVALID_TOKEN', $data['code']);
    }

    public function testVerifyTokenReturnsSuccessForValidToken(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['token' => 'valid-token']));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(false);
        $user->method('getEmail')->willReturn('user@example.com');

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $response = $this->controller->verifyToken($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Token is valid', $data['message']);
        $this->assertEquals('user@example.com', $data['email']);
    }

    // =========================================================================
    // resetPassword tests
    // =========================================================================

    public function testResetPasswordReturnsBadRequestWhenFieldsMissing(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([]));

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('MISSING_FIELDS', $data['code']);
    }

    public function testResetPasswordReturnsBadRequestWhenTokenMissing(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['password' => 'newPassword123']));

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('MISSING_FIELDS', $data['code']);
    }

    public function testResetPasswordReturnsBadRequestWhenPasswordMissing(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode(['token' => 'some-token']));

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('MISSING_FIELDS', $data['code']);
    }

    public function testResetPasswordReturnsBadRequestForWeakPassword(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'valid-token',
            'password' => 'short',
        ]));

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('WEAK_PASSWORD', $data['code']);
    }

    public function testResetPasswordReturnsBadRequestForInvalidToken(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'invalid-token',
            'password' => 'StrongPassword123',
        ]));

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->with('invalid-token')
            ->willReturn(null);

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('INVALID_TOKEN', $data['code']);
    }

    public function testResetPasswordReturnsBadRequestForExpiredToken(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'expired-token',
            'password' => 'StrongPassword123',
        ]));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(true);

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('TOKEN_EXPIRED', $data['code']);
    }

    public function testResetPasswordReturnsForbiddenForSuspendedUser(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'valid-token',
            'password' => 'StrongPassword123',
        ]));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(false);
        $user->method('getStatus')->willReturn(User::STATUS_SUSPENDED);

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_FORBIDDEN, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('ACCOUNT_INVALID', $data['code']);
    }

    public function testResetPasswordReturnsForbiddenForDeletedUser(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'valid-token',
            'password' => 'StrongPassword123',
        ]));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(false);
        $user->method('getStatus')->willReturn(User::STATUS_DELETED);

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_FORBIDDEN, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('ACCOUNT_INVALID', $data['code']);
    }

    public function testResetPasswordSuccessForActiveUser(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'valid-token',
            'password' => 'StrongPassword123',
        ]));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(false);
        $user->method('getStatus')->willReturn(User::STATUS_ACTIVE);
        $user->method('isVerified')->willReturn(true);
        $user->expects($this->once())->method('setPasswordHash')->with('hashed-password');
        $user->expects($this->once())->method('clearPasswordResetToken');

        $this->userRepository
            ->expects($this->once())
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $this->passwordHasher
            ->expects($this->once())
            ->method('hashPassword')
            ->with($user, 'StrongPassword123')
            ->willReturn('hashed-password');

        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($user);

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('Password reset successfully', $data['message']);
    }

    public function testResetPasswordMarksUnverifiedUserAsVerified(): void
    {
        $request = new Request([], [], [], [], [], [], json_encode([
            'token' => 'valid-token',
            'password' => 'StrongPassword123',
        ]));

        $user = $this->createMock(User::class);
        $user->method('isPasswordResetTokenExpired')->willReturn(false);
        $user->method('getStatus')->willReturn(User::STATUS_PENDING_VERIFICATION);
        $user->method('isVerified')->willReturn(false);
        $user->expects($this->once())->method('markAsVerified');
        $user->expects($this->once())->method('setPasswordHash');
        $user->expects($this->once())->method('clearPasswordResetToken');

        $this->userRepository
            ->method('findByPasswordResetToken')
            ->willReturn($user);

        $this->passwordHasher
            ->method('hashPassword')
            ->willReturn('hashed-password');

        $response = $this->controller->resetPassword($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }
}
