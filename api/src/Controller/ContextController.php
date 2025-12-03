<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Context;
use App\Entity\User;
use App\Repository\ContextRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/v1')]
class ContextController extends AbstractController
{
    private const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    public function __construct(
        private readonly ContextRepository $contextRepository,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/contexts', name: 'api_contexts_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $contexts = $this->contextRepository->findAllForUser($user);

        return $this->contextListResponse($contexts);
    }

    #[Route('/contexts/defaults', name: 'api_contexts_defaults', methods: ['GET'])]
    public function defaults(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $contexts = $this->contextRepository->findDefaults();

        return $this->contextListResponse($contexts);
    }

    #[Route('/contexts/{id}', name: 'api_contexts_get', methods: ['GET'], requirements: ['id' => self::UUID_PATTERN])]
    public function get(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndContext($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        return $this->json(['context' => $result['context']->toArray()]);
    }

    #[Route('/contexts', name: 'api_contexts_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (!isset($data['name']) || trim($data['name']) === '') {
            return $this->errorResponse('Name is required', 'MISSING_NAME', Response::HTTP_BAD_REQUEST);
        }

        $name = trim($data['name']);

        // Check for duplicate name
        if (!$this->contextRepository->isNameAvailable($name, $user)) {
            return $this->errorResponse(
                'A context with this name already exists',
                'DUPLICATE_NAME',
                Response::HTTP_CONFLICT
            );
        }

        $context = new Context();
        $context->setUser($user);
        $context->setName($name);

        if (isset($data['icon'])) {
            $context->setIcon($data['icon']);
        }

        if (isset($data['color'])) {
            $context->setColor($data['color']);
        }

        $maxPosition = $this->contextRepository->getMaxPositionByUser($user);
        $context->setPosition($maxPosition + 1);

        return $this->saveContextWithValidation($context, 'Context created successfully', Response::HTTP_CREATED);
    }

    #[Route('/contexts/{id}', name: 'api_contexts_update', methods: ['PATCH'], requirements: ['id' => self::UUID_PATTERN])]
    public function update(string $id, Request $request): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndContext($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $context = $result['context'];
        $user = $result['user'];

        // Cannot modify default contexts
        if ($context->isDefault()) {
            return $this->errorResponse(
                'Cannot modify default contexts',
                'CANNOT_MODIFY_DEFAULT',
                Response::HTTP_FORBIDDEN
            );
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // Update name if provided
        if (isset($data['name'])) {
            $newName = trim($data['name']);
            if ($newName === '') {
                return $this->errorResponse('Name cannot be empty', 'INVALID_NAME', Response::HTTP_BAD_REQUEST);
            }

            // Check for duplicate (excluding current context)
            if (!$this->contextRepository->isNameAvailable($newName, $user, $context->getId())) {
                return $this->errorResponse(
                    'A context with this name already exists',
                    'DUPLICATE_NAME',
                    Response::HTTP_CONFLICT
                );
            }

            $context->setName($newName);
        }

        // Update icon if provided
        if (array_key_exists('icon', $data)) {
            $context->setIcon($data['icon']);
        }

        // Update color if provided
        if (array_key_exists('color', $data)) {
            $context->setColor($data['color']);
        }

        // Update position if provided
        if (isset($data['position']) && is_int($data['position'])) {
            $context->setPosition($data['position']);
        }

        return $this->saveContextWithValidation($context, 'Context updated successfully');
    }

    #[Route('/contexts/{id}', name: 'api_contexts_delete', methods: ['DELETE'], requirements: ['id' => self::UUID_PATTERN])]
    public function delete(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndContext($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $context = $result['context'];

        // Cannot delete default contexts
        if ($context->isDefault()) {
            return $this->errorResponse(
                'Cannot delete default contexts',
                'CANNOT_DELETE_DEFAULT',
                Response::HTTP_FORBIDDEN
            );
        }

        $context->archive();
        $this->contextRepository->save($context);

        return $this->json(['message' => 'Context archived successfully']);
    }

    #[Route('/contexts/{id}/restore', name: 'api_contexts_restore', methods: ['POST'], requirements: ['id' => self::UUID_PATTERN])]
    public function restore(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndContext($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $context = $result['context'];

        if (!$context->isArchived()) {
            return $this->errorResponse('Context is not archived', 'NOT_ARCHIVED', Response::HTTP_BAD_REQUEST);
        }

        $context->activate();
        $this->contextRepository->save($context);

        return $this->json([
            'message' => 'Context restored',
            'context' => $context->toArray(),
        ]);
    }

    private function getAuthenticatedUser(): User|JsonResponse
    {
        $user = $this->getUser();

        return $user instanceof User
            ? $user
            : $this->errorResponse('Not authenticated', 'NOT_AUTHENTICATED', Response::HTTP_UNAUTHORIZED);
    }

    /**
     * @return array{user: User, context: Context}|JsonResponse
     */
    private function getAuthenticatedUserAndContext(string $id): array|JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if (!Uuid::isValid($id)) {
            return $this->errorResponse('Invalid context ID', 'INVALID_ID', Response::HTTP_BAD_REQUEST);
        }

        $context = $this->contextRepository->findById(Uuid::fromString($id));

        if ($context === null) {
            return $this->errorResponse('Context not found', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        // Allow access to default contexts (user is null) or user's own contexts
        $contextUser = $context->getUser();
        $isAccessible = $context->isDefault() || ($contextUser !== null && $contextUser->getId()->toRfc4122() === $user->getId()->toRfc4122());

        return $isAccessible
            ? ['user' => $user, 'context' => $context]
            : $this->errorResponse('Context not found', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
    }

    private function errorResponse(string $message, string $code, int $status): JsonResponse
    {
        return $this->json(['error' => $message, 'code' => $code], $status);
    }

    /**
     * @param Context[] $contexts
     */
    private function contextListResponse(array $contexts): JsonResponse
    {
        return $this->json([
            'contexts' => array_map(static fn(Context $context) => $context->toArray(), $contexts),
            'count' => count($contexts),
        ]);
    }

    private function saveContextWithValidation(Context $context, string $message, int $status = Response::HTTP_OK): JsonResponse
    {
        $errors = $this->validator->validate($context);

        if (count($errors) > 0) {
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[$error->getPropertyPath()] = $error->getMessage();
            }

            return $this->json([
                'error' => 'Validation failed',
                'code' => 'VALIDATION_ERROR',
                'details' => $errorMessages,
            ], Response::HTTP_BAD_REQUEST);
        }

        $this->contextRepository->save($context);

        return $this->json([
            'message' => $message,
            'context' => $context->toArray(),
        ], $status);
    }
}
