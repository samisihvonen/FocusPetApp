package com.focuspet.repository;

import com.focuspet.entity.ShopItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
    List<ShopItem> findByUserId(Long userId);

    List<ShopItem> findByGlobalTemplate(boolean globalTemplate);
}
