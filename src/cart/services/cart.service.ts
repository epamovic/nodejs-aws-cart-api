import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartStatuses, Product } from '../models';
import { CartEntity, CartItemEntity } from '../entities';
import { PutCartPayload } from 'src/order/type';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    const cartEntity = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cartEntity) {
      return null;
    }

    return this.mapEntityToModel(cartEntity);
  }

  async createByUserId(userId: string): Promise<Cart> {
    const cartEntity = this.cartRepository.create({
      userId,
      status: CartStatuses.OPEN,
      items: [],
    });

    const savedCart = await this.cartRepository.save(cartEntity);
    return this.mapEntityToModel(savedCart);
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const existingCart = await this.findByUserId(userId);

    if (existingCart) {
      return existingCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, payload: PutCartPayload): Promise<Cart> {
    const cartEntity = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cartEntity) {
      throw new Error('Cart not found');
    }

    const existingItem = cartEntity.items.find(
      (item) => item.productId === payload.product.id,
    );

    if (existingItem) {
      if (payload.count === 0) {
        await this.cartItemRepository.remove(existingItem);
      } else {
        existingItem.count = payload.count;
        await this.cartItemRepository.save(existingItem);
      }
    } else if (payload.count > 0) {
      const newItem = this.cartItemRepository.create({
        cartId: cartEntity.id,
        productId: payload.product.id,
        count: payload.count,
      });
      await this.cartItemRepository.save(newItem);
    }

    // Reload the cart with updated items
    const updatedCart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!updatedCart) {
      throw new Error('Cart not found after update');
    }

    return this.mapEntityToModel(updatedCart);
  }

  async removeByUserId(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }

  private mapEntityToModel(cartEntity: CartEntity): Cart {
    return {
      id: cartEntity.id.toString(),
      user_id: cartEntity.userId,
      created_at: cartEntity.createdAt.getTime(),
      updated_at: cartEntity.updatedAt.getTime(),
      status: cartEntity.status,
      items: cartEntity.items.map((item) => ({
        product: {
          id: item.productId,
          // Note: We only store productId in the database
          // Product details should be fetched from the product service
          title: '',
          description: '',
          price: 0,
        } as Product,
        count: item.count,
      })),
    };
  }
}
